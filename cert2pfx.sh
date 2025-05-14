#!/bin/bash
if [ "$(whoami)" != "webmail" ]; then
echo "[WARN] pls run shell with webmail"
exit 1
fi
#public key file locate
read -p "Please enter the public key location:" server_crt
if [ -f "$server_crt" ];
then
echo "Public File : $server_crt"
fserver_crt="$server_crt"
else
echo "[ERR] No such file or directory."
exit 1
fi
#private key file locate
read -p "Please enter the private key location:" server_key
if [ -f "$server_key" ];
then
echo "Public File : $server_key"
fserver_key="$server_key"
else
echo "[ERR] No such file or directory."
exit 1
fi
#Generate the pfx file
read -p "Please enter the PFX encrypt pass:" pf_pass
fpf_pass="$pf_pass"
openssl pkcs12 -in fserver_crt -inkey $fserver_key -export -out server.pfx -password pass:fpf_pass
#Check the file pass
if [ -f "$(pwd)/server.pfx" ];
then
if openssl pkcs12 -in (pwd)/server.pfx -noout -password pass:fpf_pass 2>/dev/null ;
then
echo "PFX file Generate done ，PFX file : $(pwd)/server.pfx"
else
echo "[ERR] PFX file Pass not match"
rm -f $(pwd)/server.pfx
fi
else
echo "[ERR] Generte pfx file failed"
fi
